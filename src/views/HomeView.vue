<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { Question, QuizQuestion, ShuffledOption, WrongAnswer } from '@/types/quiz'

// Mavjud kunlik JSON fayllar ro'yxati
const availableDays = ref<string[]>(['june_1', 'june_2'])
const selectedDay = ref<string>('june_1')

const rawQuestions = ref<Question[]>([])
const quizQuestions = ref<QuizQuestion[]>([])
const currentQuestionIndex = ref<number>(0)
const selectedAnswer = ref<number | null>(null)
const isAnswered = ref<boolean>(false)
const score = ref<number>(0)
const quizFinished = ref<boolean>(false)
const isLoading = ref<boolean>(false)
const errorMessage = ref<string>('')
const showDefinition = ref<boolean>(false)
const wrongAnswers = ref<WrongAnswer[]>([])

/**
 * Fisher-Yates Shuffle algoritmi yordamida variantlarni aralashtirish.
 * Index 0 dagi to'g'ri javobni ob'ekt ichiga `isCorrect: true` qilib yopishitib ketadi.
 */
const shuffleOptions = (options: string[], correctIndex: number): ShuffledOption[] => {
  const mappedOptions: ShuffledOption[] = options.map((opt, index) => ({
    text: opt,
    isCorrect: index === correctIndex
  }))

  for (let i = mappedOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mappedOptions[i], mappedOptions[j]] = [mappedOptions[j]!, mappedOptions[i]!]
  }
  return mappedOptions
}

/**
 * Kunlik json fayllarni dinamik import orqali yuklash funksiyasi
 */
const loadQuizData = async (): Promise<void> => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    let combinedData: Question[] = []

    if (selectedDay.value === 'all') {
      // Barcha kunlardagi testlarni bitta arrayga yig'ish
      for (const day of availableDays.value) {
        try {
          const module = await import(`@/assets/json/${day}.json`)
          combinedData = [...combinedData, ...(module.default as Question[])]
        } catch (dayError) {
          console.warn(`${day}.json faylini yuklashda xatolik:`, dayError)
        }
      }
    } else {
      // Faqat tanlangan kunni yuklash
      const module = await import(`@/assets/json/${selectedDay.value}.json`)
      combinedData = module.default as Question[]
    }

    if (combinedData.length === 0) {
      errorMessage.value = `Bu sanada quizlar mavjud emas. Tez orada yuklanadi.`
      quizQuestions.value = []
      rawQuestions.value = []
    } else {
      rawQuestions.value = combinedData
      resetQuiz()
    }
  } catch (error) {
    errorMessage.value = `Bu sanada quizlar mavjud emas. Tez orada yuklanadi.`
    console.error("JSON faylini yuklashda xatolik:", error)
    quizQuestions.value = []
    rawQuestions.value = []
  } finally {
    isLoading.value = false
  }
}

/**
 * Testni qayta sozlash va variantlarni har bir savol uchun aralashtirib chiqish
 */
const resetQuiz = (): void => {
  quizQuestions.value = rawQuestions.value.map((q: Question) => ({
    ...q,
    shuffledOptions: shuffleOptions(q.options, q.correct_option_index)
  }))
  currentQuestionIndex.value = 0
  selectedAnswer.value = null
  isAnswered.value = false
  score.value = 0
  quizFinished.value = false
  showDefinition.value = false
  wrongAnswers.value = []
}

/**
 * Variant tanlanganda javobni tekshirish
 */
const checkAnswer = (index: number, isCorrect: boolean): void => {
  if (isAnswered.value) return
  selectedAnswer.value = index
  isAnswered.value = true

  if (isCorrect) {
    score.value++
  } else {
    // Xato savolni saqlab qolish
    const currentQuestion = quizQuestions.value[currentQuestionIndex.value]
    if (!currentQuestion) return

    const correctOption = currentQuestion.shuffledOptions.find(opt => opt.isCorrect)
    const userSelectedOption = currentQuestion.shuffledOptions[index]

    if (userSelectedOption) {
      wrongAnswers.value.push({
        word: currentQuestion.word,
        definition: currentQuestion.definition,
        sentence: currentQuestion.sentence,
        correctAnswer: correctOption?.text || '',
        userAnswer: userSelectedOption.text
      })
    }
  }
}

/**
 * Keyingi savolga o'tish yoki testni yakunlash
 */
const nextQuestion = (): void => {
  selectedAnswer.value = null
  isAnswered.value = false
  showDefinition.value = false

  if (currentQuestionIndex.value < quizQuestions.value.length - 1) {
    currentQuestionIndex.value++
  } else {
    quizFinished.value = true
  }
}

// Kun o'zgarganda avtomatik yangi ma'lumotni yuklash
watch(selectedDay, (): void => {
  loadQuizData()
})

onMounted((): void => {
  loadQuizData()
})
</script>

<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-md mt-10 font-sans">

    <div class="flex flex-col sm:flex-row justify-between items-center border-b pb-4 mb-6 gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Vocabulary Quiz</h1>

      </div>

      <div class="flex items-center gap-2">
        <label for="day-select" class="text-sm font-medium text-gray-700">Kunni tanlang:</label>
        <select id="day-select" v-model="selectedDay"
          class="border rounded-lg p-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option v-for="day in availableDays" :key="day" :value="day">
            {{ day.replace('_', ' ').toUpperCase() }}
          </option>
          <option value="all">Barchasi (All Days)</option>
        </select>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-10 text-gray-500">
      Ma'lumotlar yuklanmoqda...
    </div>

    <div v-else-if="errorMessage" class="text-center py-8">
      <div class="text-4xl mb-4">⚠️</div>
      <h2 class="text-xl font-bold text-red-600 mb-2">Xatolik!</h2>
      <p class="text-gray-600 mb-6">{{ errorMessage }}</p>
      <button @click="loadQuizData"
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition">
        Qayta urinish
      </button>
    </div>

    <div v-else-if="quizQuestions.length === 0" class="text-center py-10 text-gray-500">
      Savollar topilmadi. Iltimos, boshqa kunni tanlang.
    </div>

    <div v-else-if="quizFinished" class="text-center py-8">
      <div class="text-6xl mb-4">🎉</div>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Test Yakunlandi!</h2>
      <p class="text-lg text-gray-600 mb-8">
        Sizning natijangiz: <span class="font-bold text-blue-600">{{ score }}</span> / {{ quizQuestions.length }}
      </p>

      <!-- Xato savollar bo'limi -->
      <div v-if="wrongAnswers.length > 0" class="mb-8 p-5 bg-red-50 rounded-xl border-2 border-red-200">
        <h3 class="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
          <span>❌ Xato Javoblar ({{ wrongAnswers.length }})</span>
        </h3>
        <div class="space-y-4">
          <div v-for="(wrong, idx) in wrongAnswers" :key="idx"
            class="p-4 bg-white rounded-lg border border-red-100 text-left">
            <h4 class="text-lg font-semibold text-gray-800 mb-2">"{{ wrong.word }}"</h4>
            <p class="text-sm text-gray-600 mb-3 italic">{{ wrong.definition }}</p>

            <!-- Ingliz misol -->
            <div class="p-3 bg-green-50 rounded mb-3 border border-green-200">
              <p class="text-xs font-medium text-green-700 mb-1">📖 Misol (English):</p>
              <p class="text-sm text-green-800 italic">{{ wrong.sentence.en }}</p>
            </div>

            <!-- O'zbek misol -->
            <div class="p-3 bg-orange-50 rounded mb-3 border border-orange-200">
              <p class="text-xs font-medium text-orange-700 mb-1">📖 Misol (O'zbek):</p>
              <p class="text-sm text-orange-800">{{ wrong.sentence.uz }}</p>
            </div>

            <div class="space-y-2 pt-3 border-t border-red-100">
              <div class="text-sm">
                <span class="font-medium text-red-600">Sizning javobingiz:</span>
                <p class="text-red-700">❌ {{ wrong.userAnswer }}</p>
              </div>
              <div class="text-sm">
                <span class="font-medium text-green-600">To'g'ri javob:</span>
                <p class="text-green-700">✓ {{ wrong.correctAnswer }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button @click="resetQuiz"
        class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition">
        Qayta boshlash
      </button>
    </div>

    <div v-else>
      <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div class="bg-blue-600 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }"></div>
      </div>

      <div class="flex justify-between items-center mb-4 text-sm text-gray-500">
        <span>Savol: {{ currentQuestionIndex + 1 }} / {{ quizQuestions.length }}</span>
        <span>To'g'ri: {{ score }}</span>
      </div>

      <div class="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
        <h3 class="text-2xl sm:text-3xl font-bold text-blue-900 mb-4">
          "{{ quizQuestions[currentQuestionIndex]?.word }}"
        </h3>
        <button @click="showDefinition = !showDefinition"
          class="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all hover:shadow-md">
          <span v-if="!showDefinition">👁️ Ta'rifni ko'rish</span>
          <span v-else>👁️‍🗨️ Ta'rifni yashirish</span>
        </button>
        <transition name="fade">
          <div v-if="showDefinition" class="mt-4 space-y-4">
            <!-- Definition -->
            <div class="p-3 bg-white rounded-lg border border-blue-200">
              <p class="text-gray-700 text-base sm:text-lg font-semibold text-blue-600 mb-1">Ta'rif:</p>
              <p class="text-gray-700 text-base sm:text-lg">{{ quizQuestions[currentQuestionIndex]?.definition }}</p>
            </div>

            <!-- English Sentence -->
            <div class="p-4 bg-white rounded-lg border border-green-200">
              <p class="text-gray-700 font-semibold text-green-600 mb-2 flex items-center gap-2">
                <span>🇬🇧 English:</span>
              </p>
              <p class="text-gray-700 text-base sm:text-lg italic">{{ quizQuestions[currentQuestionIndex]?.sentence?.en
              }}</p>
            </div>

            <!-- Uzbek Sentence -->
            <div class="p-4 bg-white rounded-lg border border-orange-200">
              <p class="text-gray-700 font-semibold text-orange-600 mb-2 flex items-center gap-2">
                <span>🇺🇿 O'zbek:</span>
              </p>
              <p class="text-gray-700 text-base sm:text-lg">{{ quizQuestions[currentQuestionIndex]?.sentence?.uz }}</p>
            </div>
          </div>
        </transition>
      </div>

      <div class="space-y-3">
        <button v-for="(option, index) in quizQuestions[currentQuestionIndex]?.shuffledOptions" :key="index"
          @click="checkAnswer(index, option.isCorrect)" :disabled="isAnswered"
          class="w-full text-left p-4 rounded-lg border transition-all flex justify-between items-center" :class="[
            !isAnswered ? 'border-gray-200 hover:bg-gray-50 hover:border-gray-400' : '',
            isAnswered && option.isCorrect ? 'bg-green-100 border-green-500 text-green-900 font-medium' : '',
            isAnswered && selectedAnswer === index && !option.isCorrect ? 'bg-red-100 border-red-500 text-red-900' : '',
            isAnswered && selectedAnswer !== index && !option.isCorrect ? 'border-gray-100 opacity-60' : ''
          ]">
          <span>{{ option.text }}</span>
          <span v-if="isAnswered && option.isCorrect" class="text-green-600">✓</span>
          <span v-if="isAnswered && selectedAnswer === index && !option.isCorrect" class="text-red-600">✕</span>
        </button>
      </div>

      <div class="mt-6 flex justify-end">
        <button v-if="isAnswered" @click="nextQuestion"
          class="bg-gray-800 hover:bg-gray-950 text-white font-medium py-2 px-5 rounded-lg transition">
          {{ currentQuestionIndex === quizQuestions.length - 1 ? 'Natija' : 'Keyingi →' }}
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>